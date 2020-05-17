import React, { useReducer, useEffect } from 'react';
import database from '../firebase/firebase';
import { Router, Route, Switch} from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';
import NotFoundPage from '../components/NotFoundPage';
import LoginPage from '../components/LoginPage';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import AddQuestion from '../components/AddQuestion';
import Questions from '../components/Questions';
import HelpPage from '../components/HelpPage';
import QuestionsContext from '../context/questions-context';
import YourQuestions from '../components/YourQuestions';
import questionsReducer from '../reducers/questions';
import { setQuestions, startSetQuestion } from '../actions/questions';
import filtersReducers, { filtersReducersDefaultState } from '../reducers/filters';
import FiltersContext from '../context/filters-context';
import AnsweredContext from '../context/answered-context';
import answeredReducer from '../reducers/answered';
import { startSetAnsweredQuestions } from '../actions/answered';
import UserInfoPage from '../components/UserInfoPage';
import OtherUserProfile from '../components/OtherUserProfile';

export const history = createHistory();

const AppRouter = () => {

    //TODO: Move Questions Context to PrivateRoute
    const [questions, dispatch] = useReducer(questionsReducer, []);
    //const [filters, filtersDispatch] = useReducer(filtersReducers, filtersReducersDefaultState);
    //const [answered, answeredDispatch] = useReducer(answeredReducer, [])

    // useEffect(() => {
    //     async function useEffectAsync() {
    //         await startSetQuestion(dispatch)
    //     }

    //     useEffectAsync()
    // }, []) 

    return (
    <Router history={history}>
        <QuestionsContext.Provider value={{questions, dispatch}}>              
            <Switch>
                <PublicRoute path="/" component={LoginPage} exact={true}/>
                <PrivateRoute path="/help" component={HelpPage}/>
                <PrivateRoute path="/dashboard" component={Questions}/>
                <PrivateRoute path="/add" component={AddQuestion}/>
                <PrivateRoute path="/questions" component={Questions}/>
                <PrivateRoute path="/yourquestions" component={YourQuestions}/>
                <PrivateRoute path="/user" component={UserInfoPage}/>
                <PrivateRoute path="/otheruser/:id" component={OtherUserProfile}/>
                <Route component={NotFoundPage}/>
            </Switch> 
        </QuestionsContext.Provider>
    </Router>
)};

export default AppRouter;