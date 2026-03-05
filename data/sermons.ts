
// Helper function to generate mock audio URL (for streaming simulation)
const getStreamUrl = (filename: string): string => {
  // For development/testing, using a sample audio file
  // In production, replace with your actual streaming server URL
  // return `https://stream.ojam.com/messages/${encodeURIComponent(filename)}`;

  // Using a sample audio file for testing (replace with your actual URLs)
  return `https://www.soundjay.com/misc/sounds/bell-ringing-05.wav`;
};

// Helper function to estimate duration (mock - in production, get from metadata)
const estimateDuration = (title: string): number => {
  // Estimate based on typical sermon length (30-60 minutes)
  const baseDuration = 2400; // 40 minutes
  const variation = Math.floor(Math.random() * 1200); // 0-20 minutes variation
  return baseDuration + variation;
};

// Note: All sermon data is now fetched from Supabase
// Mock data has been removed to use real data
