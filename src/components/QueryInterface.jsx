import DataUnavailable from './DataUnavailable';

export default function QueryInterface() {
  return <DataUnavailable title="Evidence retrieval unavailable">The acquisition pipeline is not implemented. A source registry is configuration, not retrieved evidence. Queries are unavailable until a verified retrieval path exists; an API key alone cannot supply evidence.</DataUnavailable>;
}
