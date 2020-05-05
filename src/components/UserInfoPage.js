import React, { useState, useReducer, useContext } from 'react'
import database from '../firebase/firebase';
import * as firebase from 'firebase';
import userReducer, { userReducerDefaultState } from '../reducers/user';
import { startSetUsername } from '../actions/user';
import UserContext from '../context/user-context';

const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)
    //const [user, userDispatch] = useReducer(userReducer, userReducerDefaultState)
    const [name, setName] = useState(user.username || "")


    const onSubmitHandler = (e) => {
        e.preventDefault()
        startSetUsername(userDispatch, user, name)
    }

    return (
        <div>
            <p>Hi</p>
            <p>{firebase.auth().currentUser.uid}</p>
            <form onSubmit={onSubmitHandler}>
                <p>Username:</p>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}/>
                <button>set username</button>
            </form>
        </div>
    )
}

export default UserInfoPage