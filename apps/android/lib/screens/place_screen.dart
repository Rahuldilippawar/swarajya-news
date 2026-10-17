import 'package:flutter/material.dart';

import '../data/models.dart';
import '../services.dart';
import '../widgets/paged_news_list.dart';

/// News for a district, narrowed to a taluka and then a village with chips.
class PlaceScreen extends StatefulWidget {
  const PlaceScreen({super.key, required this.district});
  final Place district;

  @override
  State<PlaceScreen> createState() => _PlaceScreenState();
}

class _PlaceScreenState extends State<PlaceScreen> {
  List<Place> _talukas = const [];
  List<Place> _villages = const [];
  Place? _taluka;
  Place? _village;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_talukas.isEmpty) _loadChildren(widget.district.id, (items) => _talukas = items);
  }

  Future<void> _loadChildren(String parentId, void Function(List<Place>) assign) async {
    try {
      final items = await AppServices.of(context).repository.children(parentId);
      if (mounted) setState(() => assign(items));
    } catch (_) {
      // Without the chips the district news is still shown.
    }
  }

  void _selectTaluka(Place? taluka) {
    setState(() {
      _taluka = taluka;
      _village = null;
      _villages = const [];
    });
    if (taluka != null) _loadChildren(taluka.id, (items) => _villages = items);
  }

  @override
  Widget build(BuildContext context) {
    final place = _village ?? _taluka ?? widget.district;
    Widget chips(List<Place> items, Place? selected, ValueChanged<Place?> onSelect, String allLabel) => SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(label: Text(allLabel), selected: selected == null, onSelected: (_) => onSelect(null)),
              ),
              for (final p in items)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(label: Text(p.name), selected: selected?.id == p.id, onSelected: (_) => onSelect(p)),
                ),
            ],
          ),
        );

    return Scaffold(
      appBar: AppBar(title: Text(place == widget.district ? '${widget.district.name} जिल्हा' : '${place.name}, ${widget.district.name}')),
      body: Column(
        children: [
          if (_talukas.isNotEmpty) chips(_talukas, _taluka, _selectTaluka, 'सर्व तालुके'),
          if (_villages.isNotEmpty) chips(_villages, _village, (v) => setState(() => _village = v), 'सर्व गावे'),
          Expanded(
            child: PagedNewsList(
              key: ValueKey(place.id),
              filter: PlaceNews(place),
              emptyMessage: 'या भागातील बातम्या अद्याप प्रकाशित झालेल्या नाहीत.',
            ),
          ),
        ],
      ),
    );
  }
}
