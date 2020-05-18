import React, { useContext, useReducer, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';
import Header from '../components/Header';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUser } from '../actions/user';
import UserContext from '../context/user-context';
import userlistReducer, { userlistDefaultState } from '../reducers/userlist';
import UserListContext from '../context/userlist-context';
import { startSetUserlist } from '../actions/userlist';
import filtersReducers, { filtersReducersDefaultState } from '../reducers/filters';
import FiltersContext from '../context/filters-context';
import otheruserReducer, { otherUserDefaultState } from '../reducers/otheruser';
import OtherUserContext from '../context/otheruser-context';
import QuestionsContext from '../context/questions-context';
import { startSetQuestion } from '../actions/questions';

export const PrivateRoute = ({ 
    isAuthenticated, 
    component: Component,
    ...rest
 }) => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    const [filters, filtersDispatch] = useReducer(filtersReducers, filtersReducersDefaultState)
    const [otheruser, otheruserDispatch] = useReducer(otheruserReducer, otherUserDefaultState)

    // const [userStatus, setUserStatus] = useState(false)
 
    useEffect(() => {
        async function useEffectAsync() {
            await startSetQuestion(dispatch)
            startSetUser(userDispatch)
            // const uStatus = await getUserStatus()
            // setUserStatus(uStatus)
        }
        //Cleanup: console.log('Private Route UseEffect')
        useEffectAsync()
    }, [])
    return (
        <Route {...rest} component={(props) => (
            isAuthenticated ? (
                <UserContext.Provider value={{user, userDispatch}}>
                <FiltersContext.Provider value={{filters, filtersDispatch}}>
                <OtherUserContext.Provider value={{otheruser, otheruserDispatch}}>
                    <div>
                        <Header />
                        <Component {...props}/>
                    </div>
                </OtherUserContext.Provider>
                </FiltersContext.Provider>
                </UserContext.Provider>
            ) : (
                <Redirect to="/" />
            )
        )} />
    )
 }

const mapStateToProps = (state) => ({
    isAuthenticated: !!state.auth.uid
});

export default connect(mapStateToProps)(PrivateRoute);


// {
//     userStatus ?
//     <div>
//     <Header />
//     <Component {...props}/>
//     </div> :
//     <Redirect to="/help" />
// }