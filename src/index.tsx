import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import { Router } from './Router';
import LogRocket from 'logrocket';

LogRocket.init('qdgaa4/rederly');

// This causes slowdowns and adversely affects development.
// We have static analysis for most accessibility issues, so we should limit Axe testing to 
// explicit UI/UX/Accessibility audits
// if (process.env.NODE_ENV !== 'production') {
//     var axe = require('react-axe');
//     axe(React, ReactDOM, 1000);
// }

ReactDOM.render(
    <React.StrictMode>
        <Router />
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
