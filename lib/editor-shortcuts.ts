export function commandKey(e:{key:string;ctrlKey:boolean;metaKey:boolean;shiftKey:boolean;altKey:boolean}){return (e.ctrlKey||e.metaKey?'mod+':'')+(e.altKey?'alt+':'')+(e.shiftKey?'shift+':'')+e.key.toLowerCase()}
export function defaultCommandKey(label?:string){if(!label?.includes('⌘'))return '';return 'mod+'+(label.includes('⇧')?'shift+':'')+label.replace(/[⌘⇧]/g,'').toLowerCase()}
export function shortcutLabel(key:string){return key.replace('mod+','Ctrl/⌘+').replace('alt+','Alt+').replace('shift+','Shift+').replace(/.$/,c=>c.toUpperCase())}
