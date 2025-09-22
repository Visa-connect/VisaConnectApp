const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testAdminAuth() {
  console.log('🧪 Testing Admin Authentication API...');
  console.log(
    'ℹ️  Note: This test requires admin users to have Firebase custom claims set'
  );
  console.log(
    'ℹ️  Use: node server/scripts/setAdminClaims.js set admin@visaconnect.com'
  );
  console.log(
    'ℹ️  The admin user must also exist in Firebase Auth with the correct password\n'
  );

  try {
    // Test admin login
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
      email: 'admin@visaconnect.com',
      password: 'admin123',
    });

    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      message: loginResponse.data.message,
      hasToken: !!loginResponse.data.token,
      user: loginResponse.data.user,
    });

    const token = loginResponse.data.token;
    if (!token) {
      throw new Error('No token received');
    }

    // Test token verification
    console.log('\n2. Testing token verification...');
    const verifyResponse = await axios.get(
      `${BASE_URL}/api/admin/auth/verify`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Token verification successful:', {
      success: verifyResponse.data.success,
      message: verifyResponse.data.message,
      user: verifyResponse.data.user,
    });

    // Test admin logout
    console.log('\n3. Testing admin logout...');
    const logoutResponse = await axios.post(
      `${BASE_URL}/api/admin/auth/logout`
    );

    console.log('✅ Logout successful:', {
      success: logoutResponse.data.success,
      message: logoutResponse.data.message,
    });

    // Test unauthorized access (user without admin claims)
    console.log('\n4. Testing unauthorized access...');
    try {
      await axios.post(`${BASE_URL}/api/admin/auth/login`, {
        email: 'user@example.com',
        password: 'password123',
      });
      console.log('❌ Unauthorized access should have failed');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Unauthorized access properly blocked:', {
          status: error.response.status,
          message: error.response.data.message,
        });
      } else if (error.response?.status === 401) {
        console.log('✅ User not found (expected for non-admin):', {
          status: error.response.status,
          message: error.response.data.message,
        });
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }

    console.log('\n🎉 All admin auth tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
}

// Run the test
testAdminAuth();
