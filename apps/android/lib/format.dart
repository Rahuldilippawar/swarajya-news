import 'package:intl/intl.dart';

/// Marathi digits for counts: 1234 → १,२३४.
String formatCount(int value) => NumberFormat.decimalPattern('mr').format(value);

String formatDateTime(DateTime date) => DateFormat('d MMM y, h:mm a', 'mr').format(date.toLocal());

/// "आत्ताच", "५ मिनिटांपूर्वी", "३ तासांपूर्वी", then the date.
String timeAgo(DateTime date, {DateTime? now}) {
  final diff = (now ?? DateTime.now()).difference(date);
  if (diff.inMinutes < 1) return 'आत्ताच';
  if (diff.inMinutes < 60) return '${formatCount(diff.inMinutes)} मिनिटांपूर्वी';
  if (diff.inHours < 24) return '${formatCount(diff.inHours)} तासांपूर्वी';
  return DateFormat('d MMM y', 'mr').format(date.toLocal());
}
