import DataUnavailable from './DataUnavailable';

export default function DefenseMetricsChart() {
  return <DataUnavailable title="Ingestion measurements">No measured ingestion history is available. Throughput, latency, and availability cannot be calculated without collected measurements.</DataUnavailable>;
}
