import 'babel-core/register';
import 'babel-polyfill';
import 'whatwg-fetch';
import './assets/stylesheets/app.scss';
import plugins from 'app/utils/JsPlugins';
import Iso from 'iso';
import universalRender from 'shared/UniversalRender';
import ConsoleExports from './utils/ConsoleExports';
import {serverApiRecordEvent} from 'app/utils/ServerApiClient';
import * as steem from 'steem';

window.onerror = error => {
    if (window.$STM_csrf) serverApiRecordEvent('client_error', error);
};

const CMD_LOG_T = 'log-t'
const CMD_LOG_TOGGLE = 'log-toggle'
const CMD_LOG_O = 'log-on'

try {
    if(process.env.NODE_ENV === 'development') {
        // Adds some object refs to the global window object
        ConsoleExports.init(window)
    }
} catch (e) {
    console.error(e)
}

function runApp(initial_state) {
    console.log('Initial state', initial_state);
    const konami = {
        code: 'xyzzy',
        enabled: false
    };
    const buff = konami.code.split('');
    const cmd = (command) => {
        console.log('got command:' + command);
        switch (command) {
            case CMD_LOG_O :
                konami.enabled = false;
            case CMD_LOG_TOGGLE :
            case CMD_LOG_T :
                konami.enabled = !konami.enabled;
                if(konami.enabled) {
                    steem.api.setOptions({logger: console});
                } else {
                    steem.api.setOptions({logger: false});
                }
                return 'api logging ' + konami.enabled;
            default :
                return 'That command is not supported.';
        }
        //return 'done';
    }

    const enableKonami = () => {
        if(!window.s) {
            console.log('The cupie doll is yours.');
            window.s = (command) => { return cmd.call(this, command) };
        }
    }

    window.document.body.onkeypress = (e) => {
        buff.shift()
        buff.push(e.key)
        if(buff.join('') === konami.code) {
            enableKonami();
            cmd(CMD_LOG_T)
        }
    };

    if(window.location.hash.indexOf('#'+konami.code) === 0) {
        enableKonami()
        cmd(CMD_LOG_O)
    }

    const config = initial_state.offchain.config
    steem.api.setOptions({ url: config.steemd_connection_client });
    steem.config.set('address_prefix', config.address_prefix);
    steem.config.set('chain_id', config.chain_id);
    window.$STM_Config = config;
    plugins(config);
    if (initial_state.offchain.serverBusy) {
        window.$STM_ServerBusy = true;
    }
    if (initial_state.offchain.csrf) {
        window.$STM_csrf = initial_state.offchain.csrf;
        delete initial_state.offchain.csrf;
    }

    const location = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    universalRender({history, location, initial_state})
    .catch(error => {
        console.error(error);
        serverApiRecordEvent('client_error', error);
    });
}

if (!window.Intl) {
    require.ensure(['intl/dist/Intl'], (require) => {
        window.IntlPolyfill = window.Intl = require('intl/dist/Intl');
        require('intl/locale-data/jsonp/en-US.js');
        require('intl/locale-data/jsonp/es.js');
        require('intl/locale-data/jsonp/ru.js');
        require('intl/locale-data/jsonp/fr.js');
        require('intl/locale-data/jsonp/it.js');
        Iso.bootstrap(runApp);
    }, "IntlBundle");
}
else {
    Iso.bootstrap(runApp);
}
