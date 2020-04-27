import React from 'react';
import { Router, Route, Switch} from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';
import DashboardPage from '../components/DashboardPage';
import NotFoundPage from '../components/NotFoundPage';
import LoginPage from '../components/LoginPage';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import IndecisionApp from '../components/IndecisionApp';
import AddQuestion from '../components/AddQuestion';
import Questions from '../components/Questions';

export const history = createHistory();

const AppRouter = () => (
    <Router history={history}>
    <div>
        <Switch>
            <PublicRoute path="/" component={LoginPage} exact={true}/>
            <PrivateRoute path="/dashboard" component={AddQuestion}/>
            <PrivateRoute path="/q" component={Questions}/>
            <Route component={NotFoundPage}/>
        </Switch>
    </div>
    </Router>
);

export default AppRouter;