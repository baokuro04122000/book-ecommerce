export interface INotifyResponse<T> {
  status: number;
  message: string;
  data: T;
}
