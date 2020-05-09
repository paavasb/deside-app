import React, { useReducer, useEffect } from 'react';
import { connect } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';
import Header from '../components/Header';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUser } from '../actions/user';
import UserContext from '../context/user-context';
import userlistReducer, { userlistDefaultState } from '../reducers/userlist';
import UserListContext from '../context/userlist-context';
import { startSetUserlist } from '../actions/userlist';

export const PrivateRoute = ({ 
    isAuthenticated, 
    component: Component,
    ...rest
 }) => {
    const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
 
    useEffect(() => {
        console.log('Private Route UseEffect')
        startSetUser(userDispatch)
    }, [])
    return (
        <Route {...rest} component={(props) => (
            isAuthenticated ? (
                <UserContext.Provider value={{user, userDispatch}}>
                    <div>
                        <Header />
                        <Component {...props}/>
                    </div>
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