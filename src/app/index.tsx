import AccountsScreen from "@/screens/accounts/AccountsScreen";
import { Redirect } from "expo-router";

export default function Accounts() {
  // return <AccountsScreen />;
  return <Redirect href="/(auth)/(tabs)" />;
}
