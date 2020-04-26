import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import authReducer from '../reducers/auth';
import questionsReducer from '../reducers/questions';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSIONa_COMPOSE__ || compose;

export default () => {
    const store = createStore(
        combineReducers({
            auth: authReducer,
            questions: questionsReducer
        }), 
        composeEnhancers(applyMiddleware(thunk))
    );

    return store;
};