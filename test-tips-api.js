const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data
const testPost = {
  title: 'Test Tip: Best Coffee Shops in NYC',
  description:
    'Here are some amazing coffee shops I discovered during my time in New York City. Each has its own unique charm and excellent coffee!',
  post_type: 'tip',
  photos: [
    {
      photo_url: 'https://example.com/coffee1.jpg',
      photo_public_id: 'test_coffee_1',
      display_order: 1,
    },
    {
      photo_url: 'https://example.com/coffee2.jpg',
      photo_public_id: 'test_coffee_2',
      display_order: 2,
    },
  ],
};

const testComment = {
  comment: 'Great recommendations! I love the third one especially.',
};

// Mock authentication token (you'll need to replace this with a real token)
const AUTH_TOKEN = 'your-auth-token-here';

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

async function testTipsAPI() {
  console.log('🧪 Testing Tips, Trips, and Advice API...\n');

  try {
    // Test 1: Create a new post
    console.log('1️⃣ Testing POST /api/tips-trips-advice');
    const createResponse = await axios.post(
      `${BASE_URL}/api/tips-trips-advice`,
      testPost,
      { headers }
    );
    console.log('✅ Create post successful:', createResponse.data);
    const postId = createResponse.data.data.postId;

    // Test 2: Get the post by ID
    console.log('\n2️⃣ Testing GET /api/tips-trips-advice/:postId');
    const getResponse = await axios.get(
      `${BASE_URL}/api/tips-trips-advice/${postId}`,
      { headers }
    );
    console.log('✅ Get post successful:', getResponse.data);

    // Test 3: Search posts
    console.log('\n3️⃣ Testing GET /api/tips-trips-advice');
    const searchResponse = await axios.get(
      `${BASE_URL}/api/tips-trips-advice?post_type=tip`,
      { headers }
    );
    console.log('✅ Search posts successful:', searchResponse.data);

    // Test 4: Add a comment
    console.log('\n4️⃣ Testing POST /api/tips-trips-advice/:postId/comments');
    const commentResponse = await axios.post(
      `${BASE_URL}/api/tips-trips-advice/${postId}/comments`,
      testComment,
      { headers }
    );
    console.log('✅ Add comment successful:', commentResponse.data);

    // Test 5: Like the post
    console.log('\n5️⃣ Testing POST /api/tips-trips-advice/:postId/like');
    const likeResponse = await axios.post(
      `${BASE_URL}/api/tips-trips-advice/${postId}/like`,
      {},
      { headers }
    );
    console.log('✅ Like post successful:', likeResponse.data);

    // Test 6: Update the post
    console.log('\n6️⃣ Testing PUT /api/tips-trips-advice/:postId');
    const updateData = {
      title: 'Updated: Best Coffee Shops in NYC',
      description:
        'Updated description with more details about each coffee shop.',
    };
    const updateResponse = await axios.put(
      `${BASE_URL}/api/tips-trips-advice/${postId}`,
      updateData,
      { headers }
    );
    console.log('✅ Update post successful:', updateResponse.data);

    // Test 7: Get user's posts
    console.log('\n7️⃣ Testing GET /api/tips-trips-advice/user/posts');
    const userPostsResponse = await axios.get(
      `${BASE_URL}/api/tips-trips-advice/user/posts`,
      { headers }
    );
    console.log('✅ Get user posts successful:', userPostsResponse.data);

    // Test 8: Unlike the post
    console.log(
      '\n8️⃣ Testing POST /api/tips-trips-advice/:postId/like (unlike)'
    );
    const unlikeResponse = await axios.post(
      `${BASE_URL}/api/tips-trips-advice/${postId}/like`,
      {},
      { headers }
    );
    console.log('✅ Unlike post successful:', unlikeResponse.data);

    // Test 9: Delete the post
    console.log('\n9️⃣ Testing DELETE /api/tips-trips-advice/:postId');
    const deleteResponse = await axios.delete(
      `${BASE_URL}/api/tips-trips-advice/${postId}`,
      { headers }
    );
    console.log('✅ Delete post successful:', deleteResponse.data);

    console.log('\n🎉 All tests passed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log(
        '\n💡 Note: You need to provide a valid authentication token in the AUTH_TOKEN variable'
      );
    }
  }
}

// Test photo upload endpoints
async function testPhotoAPI() {
  console.log('\n📸 Testing Photo Upload API...\n');

  try {
    // Test photo upload (this would require actual file upload)
    console.log('📤 Testing POST /api/photo/upload-tips-photo');
    console.log(
      'ℹ️  Note: This requires actual file upload with multipart/form-data'
    );

    // Test photo delete
    console.log('\n🗑️  Testing DELETE /api/photo/delete-tips-photo');
    const deletePhotoResponse = await axios.delete(
      `${BASE_URL}/api/photo/delete-tips-photo`,
      {
        headers,
        data: { publicId: 'test_photo_id' },
      }
    );
    console.log('✅ Delete photo successful:', deletePhotoResponse.data);
  } catch (error) {
    console.error(
      '❌ Photo test failed:',
      error.response?.data || error.message
    );
  }
}

// Run tests
async function runTests() {
  await testTipsAPI();
  await testPhotoAPI();
}

runTests();
