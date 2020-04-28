import React, { useReducer, useEffect } from 'react';
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
import QuestionsContext from '../context/questions-context';
import questionsReducer from '../reducers/questions';
import questionsList from '../playground/questions';

export const history = createHistory();

const AppRouter = () => {

    const [questions, dispatch] = useReducer(questionsReducer, []);

    useEffect(() => {
        const questions = JSON.parse(localStorage.getItem('questions'))
        if(questions) {
            dispatch({type: 'SET_QUESTIONS', questions})
        }

    }, []) 
    
    useEffect(() => {
        const json = JSON.stringify(questions);
        localStorage.setItem('questions', json); 
      }, [questions])

    return (
    <Router history={history}>
    <QuestionsContext.Provider value={{questions, dispatch}}>
        <Switch>
            <PublicRoute path="/" component={LoginPage} exact={true}/>
            <PrivateRoute path="/dashboard" component={AddQuestion}/>
            <PrivateRoute path="/q" component={Questions}/>
            <Route component={NotFoundPage}/>
        </Switch>
    </QuestionsContext.Provider>
    </Router>
)};

export default AppRouter;