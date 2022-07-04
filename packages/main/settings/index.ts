import Store from 'electron-store';
import { schema, AppSettings } from './schema';

export const Settings = new Store<AppSettings>({
    schema,
});
