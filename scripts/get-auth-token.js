const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function getAuthToken() {
  console.log('🔐 Getting authentication token...\n');

  try {
    // Register a test user
    console.log('1️⃣ Registering test user...');
    const registerData = {
      email: 'test@example.com',
      password: 'testpassword123',
      first_name: 'Test',
      last_name: 'User',
      visa_type: 'H1B',
      location: 'New York, NY',
      occupation: 'Software Engineer',
    };

    const registerResponse = await axios.post(
      `${BASE_URL}/api/auth/register`,
      registerData
    );
    console.log('✅ User registered successfully!');
    console.log('Token:', registerResponse.data.token);
    console.log('User ID:', registerResponse.data.data.id);

    return registerResponse.data.token;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, trying to login...');

      // Try to login instead
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123',
      };

      const loginResponse = await axios.post(
        `${BASE_URL}/api/auth/login`,
        loginData
      );
      console.log('✅ User logged in successfully!');
      console.log('Token:', loginResponse.data.token);
      console.log('User ID:', loginResponse.data.data.id);

      return loginResponse.data.token;
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Run the function
getAuthToken()
  .then((token) => {
    console.log('\n🎉 Success! Copy this token for testing:');
    console.log('='.repeat(50));
    console.log(token);
    console.log('='.repeat(50));
    console.log('\n💡 You can now use this token in your test scripts!');
  })
  .catch((error) => {
    console.error('❌ Failed to get auth token:', error.message);
  });
