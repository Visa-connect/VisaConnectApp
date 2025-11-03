#!/bin/bash

# Test script for Tips, Trips, and Advice API endpoints
# Make sure the server is running on localhost:3001

BASE_URL="http://localhost:8080"
AUTH_TOKEN="your-auth-token-here"  # Replace with actual token

echo "🧪 Testing Tips, Trips, and Advice API Endpoints"
echo "=================================================="

# Test 1: Create a new post
echo -e "\n1️⃣ Testing POST /api/tips-trips-advice"
curl -X POST "$BASE_URL/api/tips-trips-advice" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Tip: Best Coffee Shops in NYC",
    "description": "Here are some amazing coffee shops I discovered during my time in New York City.",
    "post_type": "tip",
    "photos": [
      {
        "photo_url": "https://example.com/coffee1.jpg",
        "photo_public_id": "test_coffee_1",
        "display_order": 1
      }
    ]
  }' | jq '.'

# Test 2: Search posts
echo -e "\n2️⃣ Testing GET /api/tips-trips-advice"
curl -X GET "$BASE_URL/api/tips-trips-advice?post_type=tip" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

# Test 3: Get user posts
echo -e "\n3️⃣ Testing GET /api/tips-trips-advice/user/posts"
curl -X GET "$BASE_URL/api/tips-trips-advice/user/posts" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

# Test 4: Test photo upload (requires actual file)
echo -e "\n4️⃣ Testing POST /api/photo/upload-tips-photo"
echo "ℹ️  Note: This requires actual file upload with multipart/form-data"
echo "Example: curl -X POST '$BASE_URL/api/photo/upload-tips-photo' -H 'Authorization: Bearer $AUTH_TOKEN' -F 'photo=@/path/to/image.jpg'"

# Test 5: Test photo delete
echo -e "\n5️⃣ Testing DELETE /api/photo/delete-tips-photo"
curl -X DELETE "$BASE_URL/api/photo/delete-tips-photo" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"publicId": "test_photo_id"}' | jq '.'

echo -e "\n✅ API endpoint tests completed!"
echo "💡 Note: Some tests may fail due to authentication. Make sure to provide a valid AUTH_TOKEN."
