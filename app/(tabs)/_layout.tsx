import { Tabs } from "expo-router";
import { House, PlusCircle } from "phosphor-react-native";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: "BigRaiddit",
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerShadowVisible: true,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#ffd7c4",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.OS === "android" ? 90 : 64,
          paddingBottom: Platform.OS === "android" ? 20 : 6,
          backgroundColor: "#000000",
          borderTopColor: "#000000",
          borderTopWidth: 1,
        },
        tabBarItemStyle: {
          backgroundColor: "#ff4500",
          borderRadius: 12,
          marginHorizontal: 8,
          marginTop: 6,
          marginBottom: Platform.OS === "android" ? 10 : 6,
        },
        tabBarIcon: ({ color, size }) =>
          route.name === "create" ? (
            <PlusCircle size={size} color={color} weight="duotone" />
          ) : (
            <House size={size} color={color} weight="duotone" />
          ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarLabel: "Posts",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Nouveau post",
          tabBarLabel: "Créer",
        }}
      />
      <Tabs.Screen
        name="post/[id]"
        options={{
          title: "Post",
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
