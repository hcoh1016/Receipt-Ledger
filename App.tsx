import React from 'react';
import {View,Text} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {LedgerProvider} from './src/context/LedgerProvider';
import {errorMessage} from './src/errors';
import {RootNavigator} from './src/navigation/RootNavigator';
import {Button,Loading,Notice,colors,s} from './src/components/ui';
export default function App(){
 return <SafeAreaProvider><LedgerProvider
   loading={<SafeAreaView style={{flex:1,backgroundColor:colors.paper}}><View style={s.page}><Text style={s.title}>ReceiptLedger</Text><Loading/></View></SafeAreaView>}
   error={(e,retry)=><SafeAreaView style={{flex:1,backgroundColor:colors.paper}}><View style={s.page}><Text style={s.title}>기록을 준비하지 못했어요</Text><Notice error text={errorMessage(e)}/><Button title="다시 시도" onPress={retry}/></View></SafeAreaView>}
 ><RootNavigator/></LedgerProvider></SafeAreaProvider>;
}
