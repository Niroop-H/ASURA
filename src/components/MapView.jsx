import DataUnavailable from './DataUnavailable';

export default function MapView() {
  return <DataUnavailable title="Geospatial observations">No geographic data provider is connected to this view. The previous illustrative map and sample positions have been removed. A map renderer and verified source integration are required.</DataUnavailable>;
}
