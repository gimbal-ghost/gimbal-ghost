import Store from 'electron-store';
import { schema, ISettings } from './schema';

export const Settings = new Store<ISettings>({
    schema,
});
