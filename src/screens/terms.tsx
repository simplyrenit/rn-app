import { StaticContainer, Text } from "@/components/core";
import { useNavigation } from "@react-navigation/native";

import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { TERMS_CONTENT } from "@/lib/content";
import { styled } from "nativewind";
import {
  ScrollView,
  Text as RNT,
  TouchableOpacity,
  View,
  Platform,
  SafeAreaView,
  StyleSheet,
  Pressable
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { WebView } from 'react-native-webview';
import { isIOS } from "@/utils/checks";

const StyledScroll = styled(ScrollView);

export default function Terms() {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const navigator = useNavigation();

  const goBack = () => {
    if (navigator?.canGoBack()) {
      navigator?.goBack();
    }
    else if(navigator) {
      navigator?.navigate?.('HOME');
    }
  };



  return (
<SafeAreaView style={styles.container}>
<Pressable
        onPress={goBack}
        style={styles.pressable}
      >
        <ArrowLeftIcon
            size={24}
            color={isDarkMode ? "white" : "black"}
          />
      </Pressable>
  <WebView
    source={{ uri: 'https://renit.notion.site/Renit-Terms-Conditions-1c5a74a67e958089881ddc16717ca58b' }}
    originWhitelist={['*']}
    startInLoadingState
    style={{ flex: 1 }}
    javaScriptEnabled={true}
  />
</SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container:{
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  pressable:{
    padding:8,
    position: 'absolute',
    marginTop: isIOS()? 106 : 36,
    zIndex:1,
    backgroundColor:'transparent',
    marginLeft: 16
  },
})
