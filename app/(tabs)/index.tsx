import {View,Text} from "react-native"
import {useNavigation} from "expo-router"
import { Button } from "@react-navigation/elements";
export default function ExploreScreen() {
  const navigate=useNavigation()
  return (
    <View className="bg-slate-500 justify-center items-center" >
      <Text className="text-blue-300">Home Screen</Text>
      <Button >Home</Button>
    </View>
  );
}