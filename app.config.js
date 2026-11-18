module.exports = {
  expo: {
    name: "ReceiptLedger",
    slug: "receipt-ledger",
    version: "1.0.0",
    orientation: "portrait",
    platforms: ["android"],
    android: {
      package: "com.receiptledger.app",
      allowBackup: false,
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
    },
    plugins: [
      ["expo-camera", {cameraPermission:"영수증 촬영에 카메라를 사용합니다.",recordAudioAndroid:false}],
      ["expo-build-properties", { android: { minSdkVersion: 29 } }],
      [
        "expo-image-picker",
        {
          photosPermission: "영수증 사진을 선택합니다.",
          cameraPermission: "영수증을 촬영합니다.",
          microphonePermission: false,
        },
      ],
      "expo-sqlite",
      "./plugins/withPrivateStorage",
    ],
    updates: { enabled: false },
  },
};
