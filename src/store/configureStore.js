import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import authReducer from '../reducers/auth';
import questionsReducer from '../reducers/questions';
import filtersReducers from '../reducers/filters';
import answeredReducer from '../reducers/answered';
import userReducer from '../reducers/user';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSIONa_COMPOSE__ || compose;

export default () => {
    const store = createStore(
        combineReducers({
            auth: authReducer,
            questions: questionsReducer,
            filters: filtersReducers,
            answered: answeredReducer,
            user: userReducer
        }), 
        composeEnhancers(applyMiddleware(thunk))
    );

    return store;
};