# Ojam - Sermon Streaming App 📿

An Audiomack-style mobile app for streaming sermons from your church. Built with React Native and Expo.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Features

- 🎵 **Stream Sermons**: Play audio sermons with a beautiful, modern interface
- 🏠 **Home Feed**: Browse trending and recently added sermons
- 📚 **Library**: Manage your downloads, queue, and favorites
- 🔍 **Search**: Search sermons by title, preacher, or category
- ▶️ **Audio Player**: Full-featured player with play/pause, seek, and queue management
- 🎨 **Dark Mode**: Automatic theme support
- 📱 **Mini Player**: Quick access player bar at the bottom

## Project Structure

```
app/
  (tabs)/
    index.tsx      # Home screen with trending sermons
    library.tsx    # Library with downloads, queue, favorites
    search.tsx     # Search sermons and browse by category
    _layout.tsx    # Tab navigation
  player.tsx       # Full player screen
  _layout.tsx      # Root layout with AudioPlayerProvider

components/
  sermon-card.tsx  # Sermon list item component
  mini-player.tsx  # Bottom mini player bar

contexts/
  AudioPlayerContext.tsx  # Global audio player state management

data/
  sermons.ts       # Sample sermon data (replace with your API)

types/
  sermon.ts        # TypeScript types for sermons
```

## Setup Your Sermons

1. **Update Sermon Data**: Edit `data/sermons.ts` with your actual sermon URLs and information
2. **Add Audio URLs**: Replace the sample URLs with your actual sermon audio file URLs
3. **Add Images**: Update image URLs or use local images
4. **Connect to API** (optional): Replace the sample data with API calls to your backend

Example sermon structure:
```typescript
{
  id: '1',
  title: 'Walking in Faith',
  preacher: 'Pastor John Doe',
  date: '2024-01-15',
  duration: 3600, // in seconds
  audioUrl: 'https://your-domain.com/sermons/audio.mp3',
  imageUrl: 'https://your-domain.com/sermons/image.jpg',
  description: 'Sermon description...',
  category: 'Faith',
  plays: 1250,
  likes: 89,
}
```

## Next Steps

- Connect to your backend API to fetch real sermon data
- Implement download functionality for offline listening
- Add user authentication
- Implement favorites/likes system
- Add playlist creation
- Enable background audio playback
- Add push notifications for new sermons

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
