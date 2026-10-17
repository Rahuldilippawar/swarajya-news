/// FCM topic names. Must match shared/src/notifications.ts, which the Cloud Function uses to send.
const allNewsTopic = 'news_all';

String districtTopic(String districtId) => 'district_${districtId.replaceAll(RegExp(r'[^A-Za-z0-9_.~-]'), '_')}';
