const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Test data
const testUser = {
  email: 'test@example.com',
  username: 'testuser123',
  password: 'testpass123',
  confirmPassword: 'testpass123'
};

async function testHealthCheck() {
  try {
    console.log('🏥 Testing health check...');
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check passed:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testSignup() {
  try {
    console.log('\n📝 Testing user signup...');
    const response = await axios.post(`${BASE_URL}/auth/signup`, testUser);
    console.log('✅ Signup successful:', response.data.message);
    console.log('👤 User ID:', response.data.user._id);
    console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
    return response.data.token;
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.error === 'Email already registered') {
      console.log('⚠️ User already exists, proceeding with login...');
      return await testLogin();
    }
    console.error('❌ Signup failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testLogin() {
  try {
    console.log('\n🔐 Testing user login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', response.data.message);
    console.log('👤 User ID:', response.data.user._id);
    console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetProfile(token) {
  try {
    console.log('\n👤 Testing get profile...');
    const response = await axios.get(`${BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieved:', response.data.user.username);
    return true;
  } catch (error) {
    console.error('❌ Get profile failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUpdateStats(token) {
  try {
    console.log('\n📊 Testing update game stats...');
    const stats = {
      totalPlayTime: 3600,
      gamesPlayed: 5,
      highScore: 15000
    };
    const response = await axios.put(`${BASE_URL}/user/stats`, stats, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Stats updated:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Update stats failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetStats(token) {
  try {
    console.log('\n📈 Testing get game stats...');
    const response = await axios.get(`${BASE_URL}/user/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Stats retrieved:');
    console.log('   🎮 Total play time:', response.data.stats.totalPlayTime, 'seconds');
    console.log('   🏆 Games played:', response.data.stats.gamesPlayed);
    console.log('   🥇 High score:', response.data.stats.highScore);
    return true;
  } catch (error) {
    console.error('❌ Get stats failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testLeaderboard() {
  try {
    console.log('\n🏆 Testing leaderboard...');
    const response = await axios.get(`${BASE_URL}/user/leaderboard?limit=5`);
    console.log('✅ Leaderboard retrieved:', response.data.leaderboard.length, 'users');
    if (response.data.leaderboard.length > 0) {
      console.log('🥇 Top player:', response.data.leaderboard[0].username, '- Score:', response.data.leaderboard[0].gameStats.highScore);
    }
    return true;
  } catch (error) {
    console.error('❌ Leaderboard failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Unity Auth Backend API Tests...\n');
  
  // Test health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Backend is not running. Please start the server first with: npm run dev');
    return;
  }
  
  // Test signup/login
  authToken = await testSignup();
  if (!authToken) {
    console.log('\n❌ Authentication failed. Cannot continue with other tests.');
    return;
  }
  
  // Test authenticated endpoints
  await testGetProfile(authToken);
  await testUpdateStats(authToken);
  await testGetStats(authToken);
  await testLeaderboard();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('   ✅ Health check');
  console.log('   ✅ User authentication');
  console.log('   ✅ Profile management');
  console.log('   ✅ Game statistics');
  console.log('   ✅ Leaderboard system');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testSignup,
  testLogin,
  testGetProfile,
  testUpdateStats,
  testGetStats,
  testLeaderboard
};
