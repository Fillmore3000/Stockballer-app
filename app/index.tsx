/**
 * Root Index - Redirects to Home Tab
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)" />;
}
