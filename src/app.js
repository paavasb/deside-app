import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import AppRouter, { history } from './routers/AppRouter';
import configureStore from './store/configureStore';
import { login, logout } from './actions/auth';
//import 'bootstrap/dist/css/bootstrap.min.css';
//import 'semantic-ui-css/semantic.min.css'
import 'normalize.css/normalize.css';
import 'react-dates/lib/css/_datepicker.css';
import './styles/styles.scss';
import { firebase } from './firebase/firebase';
import LoadingPage from './components/LoadingPage';
import IndecisionApp from './components/IndecisionApp';
import { startAddExpense } from './actions/questions';

const store = configureStore();

let hasRendered = false;

const renderApp = () => {
    if(!hasRendered) {
        ReactDOM.render(jsx, document.getElementById('app'));
        hasRendered = true;
    }
};

const jsx = (
    <Provider store={store}>
        <AppRouter />
    </Provider>
);


// store.dispatch(startAddExpense({
//     title: 'Is this a question?', 
//     options: [{text: 'Yes', votes: 2}, {text: 'No', votes: 0}],
//     tags: ['Tag1'], 
//     createdAt: 0,
//     creator: user.uid
// }));

ReactDOM.render(<LoadingPage />, document.getElementById('app'));

firebase.auth().onAuthStateChanged((user) => {
    if(user) {
        store.dispatch(login(user.uid));
        renderApp();
        if(history.location.pathname === '/') {
            history.push('/questions');
        }
    } else {
        store.dispatch(logout());
        renderApp();
        history.push('/');  
    }
});