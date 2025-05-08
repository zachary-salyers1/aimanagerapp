/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// V2 Firestore Trigger
import { onDocumentCreated, FirestoreEvent } from "firebase-functions/v2/firestore"; // Import FirestoreEvent from V2
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { google, Auth } from "googleapis"; // Import Auth
import { QueryDocumentSnapshot } from "firebase-functions/v1/firestore"; // Keep this for snapshot type

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin SDK (if not already done elsewhere)
admin.initializeApp();

// Define the scope needed for Google Drive API (folder creation)
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Cloud Function triggered when a new project document is created in Firestore (V2).
 * Creates a corresponding folder in Google Drive and updates the project document
 * with the folder ID.
 */
export const createDriveFolderForProject = onDocumentCreated(
    "projects/{projectId}", 
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, {projectId: string}>) => {
      // Ensure snapshot and data exist
      const snapshot = event.data;
      if (!snapshot) {
          logger.error("No data associated with the event");
          return;
      }
      const projectData = snapshot.data();
      if (!projectData) {
          logger.error("Project data is undefined");
          return;
      }

      const projectId = event.params.projectId;
      const projectName = projectData.name || `Project ${projectId}`;
      const ownerUid = projectData.ownerId; // This is the Firebase UID

      logger.info(
          `V2: Creating Drive folder for project ${projectId} (${projectName}), owner UID: ${ownerUid}`,
      );

      if (!ownerUid) {
        logger.error(`Project ${projectId} is missing ownerUid. Cannot create Drive folder or share.`);
        return;
      }

      try {
        // 0. Get User Email from UID
        let ownerEmail: string | undefined;
        try {
          const userRecord = await admin.auth().getUser(ownerUid);
          ownerEmail = userRecord.email;
          if (!ownerEmail) {
            logger.error(`No email found for user UID: ${ownerUid}. User record:`, JSON.stringify(userRecord)); // Log entire user record for inspection
            // We can still create the folder, but won't be able to share it to a specific user email.
            // Depending on policy, you might choose to return or log and continue.
          } else {
            logger.info(`Retrieved email ${ownerEmail} for owner UID ${ownerUid}`);
          }
        } catch (authError: any) {
          logger.error(
            `Error fetching user data for UID ${ownerUid}:`,
            authError?.message || authError,
            authError?.stack, // Add stack trace for authError
            JSON.stringify(authError) // Log the full authError object
          );
          // If we can't get the email, we can't share. Decide if folder creation should still proceed.
          // For now, we will log and proceed to create the folder, it just won't be shared automatically to the user.
        }

        // 1. Authenticate to Google Drive API
        const auth = new google.auth.GoogleAuth({
          scopes: DRIVE_SCOPES,
        });
        // Explicitly get OAuth2 client if possible, or handle other types
        const authClient = await auth.getClient() as Auth.OAuth2Client; 
        const drive = google.drive({ version: "v3", auth: authClient });

        // 2. Create the Google Drive Folder
        const fileMetadata = {
          name: `${projectName} [${projectId}]`,
          mimeType: "application/vnd.google-apps.folder",
          // parents: ["YOUR_PARENT_FOLDER_ID"] // Optional
        };

        const response = await drive.files.create({
          requestBody: fileMetadata,
          fields: "id",
        });

        const folderId = response.data.id;
        if (!folderId) {
          throw new Error("Drive API did not return a folder ID.");
        }
        logger.info(`Created Drive folder ID: ${folderId} for project ${projectId}`);

        // 3. Share the folder with the project owner if email was found
        if (ownerEmail) {
          try {
            await drive.permissions.create({
              fileId: folderId,
              requestBody: {
                role: 'writer', // Changed from 'owner' to 'writer'
                type: 'user',
                emailAddress: ownerEmail, 
              },
              // transferOwnership: true, // Removed, not needed for 'writer' role and was causing issues
            });
            logger.info(`Granted 'writer' permission for Drive folder ${folderId} to user ${ownerEmail}`);
          } catch (shareError: any) {
            logger.error(
                `Error granting 'writer' permission for Drive folder ${folderId} to ${ownerEmail}:`,
                shareError?.message || shareError,
                shareError?.stack
            );
            // Continue even if sharing/ownership transfer fails, project is still updated with folderId
          }
        } else {
          logger.warn(`Cannot share Drive folder ${folderId} for project ${projectId} as owner email could not be retrieved.`);
          // The folder will remain owned by the service account.
        }

        // 4. Update Firestore Project Document
        await snapshot.ref.update({ driveFolderId: folderId });
        logger.info(`Updated project ${projectId} with driveFolderId.`);

        return;
      } catch (error: any) {
        logger.error(
            `Error creating Drive folder for ${projectId}:`,
            error?.message || error,
            error?.stack, // Log stack trace for better debugging
        );
        // Optional: Update project doc with error?
        // await snapshot.ref.update({ driveFolderSyncError: error.message });
        return; // Important to return to avoid infinite retries on permanent errors
      }
    });

// Add other functions later (e.g., for syncing documents)
