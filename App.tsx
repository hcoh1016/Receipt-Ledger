// 공용 진입점. 팀원은 IntegrationScreen을 최종 RootNavigator로 교체하면 된다.
import React from "react";
import { Text, View, Button } from "react-native";
import { LedgerProvider } from "./src/context/LedgerProvider";
import { errorMessage } from "./src/errors";
import { IntegrationScreen } from "./examples/IntegrationScreen";
export default function App() {
  return (
    <LedgerProvider
      loading={
        <View style={{ padding: 32 }}>
          <Text>가계부 준비 중…</Text>
        </View>
      }
      error={(e, retry) => (
        <View style={{ padding: 32 }}>
          <Text>{errorMessage(e)}</Text>
          <Button title="다시 시도" onPress={retry} />
        </View>
      )}
    >
      <IntegrationScreen />
    </LedgerProvider>
  );
}
