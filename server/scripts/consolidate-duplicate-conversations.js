const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK with environment variable support
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Staging/Production: Use environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Using Firebase service account from environment variable');
  } catch (error) {
    console.error(
      '❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:',
      error.message
    );
    process.exit(1);
  }
} else {
  // Local Development: Use local file
  try {
    serviceAccount = require(path.join(
      __dirname,
      '../firebase-stage-credentials.json'
    ));
    console.log('✅ Using Firebase service account from local file');
  } catch (error) {
    console.error(
      '❌ Failed to load Firebase credentials file:',
      error.message
    );
    console.error(
      '💡 Make sure firebase-stage-credentials.json exists in the server directory'
    );
    console.error('💡 Or set FIREBASE_SERVICE_ACCOUNT environment variable');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function consolidateDuplicateConversations() {
  console.log('Starting conversation consolidation...');

  try {
    // Get all conversations
    const conversationsSnapshot = await db.collection('conversations').get();
    const conversations = [];

    conversationsSnapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`Found ${conversations.length} total conversations`);

    // Group conversations by participants
    const participantGroups = new Map();

    conversations.forEach((conv) => {
      if (conv.participants && conv.participants.length === 2) {
        // Sort participants to create a consistent key
        const key = conv.participants.sort().join('|');

        if (!participantGroups.has(key)) {
          participantGroups.set(key, []);
        }
        participantGroups.get(key).push(conv);
      }
    });

    console.log(`Found ${participantGroups.size} unique participant pairs`);

    let consolidatedCount = 0;
    let deletedCount = 0;

    // Process each group
    for (const [participantKey, convs] of participantGroups) {
      if (convs.length > 1) {
        console.log(
          `\nConsolidating ${convs.length} conversations for participants: ${participantKey}`
        );

        // Sort by creation date to keep the oldest conversation
        convs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });

        const keepConversation = convs[0];
        const deleteConversations = convs.slice(1);

        console.log(
          `Keeping conversation: ${
            keepConversation.id
          } (created: ${keepConversation.createdAt?.toDate?.()})`
        );

        // Get all messages from conversations to be deleted
        const allMessages = [];
        for (const conv of deleteConversations) {
          console.log(`Processing messages from conversation: ${conv.id}`);

          const messagesSnapshot = await db
            .collection('conversations')
            .doc(conv.id)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

          messagesSnapshot.forEach((doc) => {
            allMessages.push({
              id: doc.id,
              ...doc.data(),
            });
          });
        }

        // Move all messages to the conversation we're keeping
        if (allMessages.length > 0) {
          console.log(
            `Moving ${allMessages.length} messages to conversation ${keepConversation.id}`
          );

          for (const message of allMessages) {
            const newMessageRef = db
              .collection('conversations')
              .doc(keepConversation.id)
              .collection('messages')
              .doc();

            await newMessageRef.set({
              ...message,
              id: newMessageRef.id,
            });
          }
        }

        // Update the kept conversation's last message info if needed
        if (allMessages.length > 0) {
          const lastMessage = allMessages[allMessages.length - 1];
          await db
            .collection('conversations')
            .doc(keepConversation.id)
            .update({
              lastMessage: {
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                receiverId: lastMessage.receiverId,
                timestamp: lastMessage.timestamp,
              },
              lastMessageTime: lastMessage.timestamp,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Delete the duplicate conversations
        for (const conv of deleteConversations) {
          console.log(`Deleting conversation: ${conv.id}`);

          // Delete all messages in the conversation first
          const messagesSnapshot = await db
            .collection('conversations')
            .doc(conv.id)
            .collection('messages')
            .get();

          const batch = db.batch();
          messagesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();

          // Delete the conversation document
          await db.collection('conversations').doc(conv.id).delete();
          deletedCount++;
        }

        consolidatedCount++;
      }
    }

    console.log(`\nConsolidation complete!`);
    console.log(
      `- Consolidated ${consolidatedCount} groups of duplicate conversations`
    );
    console.log(`- Deleted ${deletedCount} duplicate conversations`);
    console.log(`- Moved messages to the oldest conversation in each group`);
  } catch (error) {
    console.error('Error during consolidation:', error);
  } finally {
    process.exit(0);
  }
}

// Run the consolidation
consolidateDuplicateConversations();
