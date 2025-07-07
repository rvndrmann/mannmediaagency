import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';

export default function App() {
  return (
    <WebView
      source={{ uri: 'https://mannmediaagency.com' }}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      )}
      onShouldStartLoadWithRequest={(event) => {
        if (event.url.startsWith('https://mannmediaagency.com')) {
          return true;
        } else {
          Linking.openURL(event.url);
          return false;
        }
      }}
    />
  );
}
