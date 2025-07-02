import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

const App = () => {
  const [loading, setLoading] = useState(true);
  const webviewUrl = 'https://mannmediaagency.com';

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: webviewUrl }}
        style={styles.webview}
        onLoad={() => setLoading(false)}
        onShouldStartLoadWithRequest={(event) => {
          if (!event.url.startsWith(webviewUrl)) {
            Linking.openURL(event.url);
            return false;
          }
          return true;
        }}
      />
      {loading && (
        <ActivityIndicator
          style={styles.loading}
          size="large"
          color="#0000ff"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
