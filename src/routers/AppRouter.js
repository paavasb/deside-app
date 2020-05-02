import React, { useReducer, useEffect } from 'react';
import database from '../firebase/firebase';
import { Router, Route, Switch} from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';
import DashboardPage from '../components/DashboardPage';
import NotFoundPage from '../components/NotFoundPage';
import LoginPage from '../components/LoginPage';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import AddQuestion from '../components/AddQuestion';
import Questions from '../components/Questions';
import QuestionsContext from '../context/questions-context';
import YourQuestions from '../components/YourQuestions';
import questionsReducer from '../reducers/questions';
import questionsList from '../playground/questions';
import { setQuestions, startSetQuestion } from '../actions/questions';
import filtersReducers, { filtersReducersDefaultState } from '../reducers/filters';
import FiltersContext from '../context/filters-context';
import AnsweredContext from '../context/answered-context';
import answeredReducer from '../reducers/answered';
import { startSetAnsweredQuestions } from '../actions/answered';

export const history = createHistory();

const AppRouter = () => {

    const [questions, dispatch] = useReducer(questionsReducer, []);
    //const [filters, filtersDispatch] = useReducer(filtersReducers, filtersReducersDefaultState);
    //const [answered, answeredDispatch] = useReducer(answeredReducer, [])

    useEffect(() => {
        startSetQuestion(dispatch)
    }, []) 

    
    // useEffect(() => {
    //     const json = JSON.stringify(questions);
    //     localStorage.setItem('questions', json); 
    //   }, [questions])

    return (
    <Router history={history}>
        <QuestionsContext.Provider value={{questions, dispatch}}>              
            <Switch>
                <PublicRoute path="/" component={LoginPage} exact={true}/>
                <PrivateRoute path="/dashboard" component={Questions}/>
                <PrivateRoute path="/add" component={AddQuestion}/>
                <PrivateRoute path="/questions" component={Questions}/>
                <PrivateRoute path="/yourquestions" component={YourQuestions}/>
                <Route component={NotFoundPage}/>
            </Switch> 
        </QuestionsContext.Provider>
    </Router>
)};

export default AppRouter;