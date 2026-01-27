require('source-map-support').install();

export interface DataSourceConfig {
  get: (key: string) => any;
}

export abstract class DataSource {
  public abstract initialize(config: DataSourceConfig): Promise<void>;
  public abstract get(key: string): Promise<any>;
  public abstract name(): string;
}

export default DataSource;
