import { Image } from "react-native";

export default function LogoIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/brand/logo-notext.png")}
      style={{ width: size, height: size }}
    />
  );
}
