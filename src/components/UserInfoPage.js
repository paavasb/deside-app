import React, { useState, useReducer, useContext, useEffect } from 'react'
import database from '../firebase/firebase'
import * as firebase from 'firebase'
import ReactSearchBox from 'react-search-box'
import userReducer, { userReducerDefaultState } from '../reducers/user'
import { startSetUsername, startRemoveFollowing, startRemoveFollower, startSetUser, startAddFollowing } from '../actions/user'
import UserContext from '../context/user-context'
import OtherUserContext from '../context/otheruser-context'
import { getUsername, getUsernames, checkFollow, checkFollowingBack, checkFollowFollowingStatus } from '../actions/helperActions'
import userlistReducer, { userlistDefaultState } from '../reducers/userlist'
import { startSetUserlist } from '../actions/userlist'
import UserListContext from '../context/userlist-context'
import { history } from '../routers/AppRouter'
import otheruserReducer, { otherUserDefaultState } from '../reducers/otheruser'
import { startSetOtheruser } from '../actions/otheruser'

//TODO: Style User Info Page
//TODO: Search Users
const UserInfoPage = () => {
    const { user, userDispatch } = useContext(UserContext)  //Current User
    const [userlist, userlistDispatch] = useReducer(userlistReducer, userlistDefaultState)  //List of users and usernames
    const [name, setName] = useState(user.username || "")   //Current username
    const [followingUsernames, setFollowingUsernames] = useState([])    //List of followings (current user)
    const [followersUsernames, setFollowersUsernames] = useState([])    //List of followers (current user)
    const [changeUsername, setChangeUsername] = useState(false) //Username change option status
    const [showFollowing, setShowFollowing] = useState(false)   //Following display option status
    const [showFollowers, setShowFollowers] = useState(false)   //Followers display option status
    const [showSearch, setShowSearch] = useState(false) //Search functionality display status
    const [showUserListData, setShowUserListData] = useState(false) //
    const [selectedUser, setSelectedUser] = useState({})    //User selected from search
    const [showSelectedUser, setShowSelectedUser] = useState(false) //Show details for selected user status
    //const [otheruser, otheruserDispatch] = useReducer(otheruserReducer, otherUserDefaultState) 
    //const {otheruser, otheruserDispatch} = useContext(OtherUserContext) //other user found using search

    useEffect(() => {
        let mounted = true
        async function getFollowingUsernames() {
            console.log('USERINFO USEFFECT')
            setFollowingUsernames(await getUsernames(user.following))
        
            await user.followers.forEach(async (followerID) => {
                setFollowersUsernames(await getUsernames(user.followers))
            })

            await startSetUserlist(userlistDispatch)
        }

        if(mounted) {
            getFollowingUsernames()
        }
        return () => mounted = false
    }, [])


    const onSubmitHandler = (e) => {
        async function onSubmitHandlerAsync(e) {
            e.preventDefault()
            startSetUsername(userDispatch, user, name)
            setChangeUsername(false)
        }

        onSubmitHandlerAsync(e)
    }

    const unFollowHandler = (followingID) => {
        async function unFollowHandlerAsync() {
            //console.log(followingID)
            await startRemoveFollowing(userDispatch, user.userID, followingID)
        }

        unFollowHandlerAsync()
    }

    const unFollowerHandler = (followerID) => {
        async function unFollowerHandlerAsync() {
            //console.log(followerID)
            await startRemoveFollower(userDispatch, user.userID, followerID)
        }

        unFollowerHandlerAsync()
    }

    const followBackHandler = (followerID) => {
        async function followBackHandlerAsync() {
            //console.log(followerID)
            await startAddFollowing(userDispatch, user.userID, followerID)
        }

        followBackHandlerAsync()
    }

    const searchOnSelect = (selected) => {
        async function searchOnSelectAsync() {
            console.log(selected)
            const userID = selected.key
            const username = selected.value
            const followStatus = checkFollowFollowingStatus(user.following, user.followers, userID)
            setSelectedUser({
                userID,
                username,
                followStatus
            }) 
            // const otheruserValue = { userID, username, followStatus}
            // console.log('Other User', otheruserValue)
            // startSetOtheruser(otheruserValue, otheruserDispatch)
            // console.log('Selected User', selectedUser)
            setShowSelectedUser(true)
            //history.push(`/otheruser/${userID}`)
        }

        searchOnSelectAsync()
    }

    return (
        
        <div className="content-container content-container--user">
            <div className="user-profile">
                <div className="user-profile__greeting">
                    <p className="user-profile__greeting__text">Hi, {firebase.auth().currentUser.displayName}!</p>
                    <div className="user-profile__greeting__username">
                        <h3 className="user-profile__greeting__username__text">{!changeUsername && `Username: ${user.username}`}</h3>
                        <form onSubmit={onSubmitHandler}>
                            {
                                changeUsername ?
                                <div>
                                    <input 
                                        className="user-profile__greeting__username__input"
                                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                                    />
                                    <button className="button button--set-username">Set Username</button>
                                    <button
                                        className="button button--username-cancel" 
                                        onClick={(e) => {
                                        e.preventDefault()
                                        setChangeUsername(false)}}
                                    >Cancel</button>
                                </div> :
                                <button 
                                    className="button button--set-username"
                                    onClick={(e) => {
                                    e.preventDefault()
                                    setChangeUsername(true)}}
                                > Change Username </button>
                            }
                        </form>
                    </div>
                </div>
                <div className="user-profile__search">
                    {<ReactSearchBox
                        placeholder="Search for users"
                        value=""
                        data={userlist}
                        callback={record => console.log(record)}
                        dropDownHoverColor='#ADD8E6'
                        inputBoxFontSize='4'
                        onSelect={searchOnSelect}
                    />}
                    {
                        showSelectedUser &&
                        (
                            <div className="user-profile__search__user">
                                <p className="user-profile__search__user__name">{selectedUser.username}</p>
                                {
                                    selectedUser.followStatus.followingStatus ?
                                    <p className="user-profile__search__user__following">Following</p> :
                                    <p className="user-profile__search__user__not-following">Not Following</p>
                                }
                                {
                                    selectedUser.followStatus.followerStatus ?
                                    <p className="user-profile__search__user__following">Follower</p> :
                                    <p className="user-profile__search__user__not-following">Not a Follower</p>
                                }
                                {
                                    selectedUser.followStatus.followingStatus ?
                                    <button className="button button--search-follow"
                                        onClick={() => unFollowHandler(selectedUser.userID)}>Unfollow</button> :
                                    selectedUser.followStatus.followerStatus ?
                                    <button className="button button--search-follow"
                                        onClick={() => followBackHandler(selectedUser.userID)}>Follow Back</button> :
                                    <button className="button button--search-follow"
                                        onClick={() => followBackHandler(selectedUser.userID)}>Follow</button>
                                }
                                {
                                    selectedUser.followStatus.followerStatus &&
                                    <button className="button button--search-follow"
                                        onClick={() => unFollowerHandler(selectedUser.userID)}>Remove Follower</button>
                                }
                                <button className="button button--search-cancel"
                                    onClick={() => setShowSelectedUser(false)}>Cancel</button>
                            </div>
                        )
                    }
                </div>

                <div className="user-profile__follow">
                    <h3>Following ({user.following.length})</h3>
                    <button onClick={(e) => {
                        e.preventDefault()
                        setShowFollowing(!showFollowing)}}>{showFollowing ? 'Hide Following' : 'Show Following'}</button>
                    {
                        showFollowing &&
                            followingUsernames.map((followingUsername, index) => {
                                return (
                                    <div key={followingUsername}>
                                    <p>{followingUsername}</p>
                                    <button onClick={() => unFollowHandler(user.following[index])}>Unfollow</button> 
                                    </div>
                                    
                                )
                            })
                    }
                    <h3>Followers ({user.followers.length})</h3>
                    <button onClick={(e) => {
                        e.preventDefault()
                        setShowFollowers(!showFollowers)}}>{showFollowers ? 'Hide Followers' : 'Show Followers'}</button>
                    {
                        showFollowers &&
                        followersUsernames.map((followerUsername, index) => {
                            const followingBack = checkFollowingBack(user.following, user.followers[index])
                            return (
                                <div key={followerUsername}>
                                    <p>{followerUsername}</p>
                                    <button onClick={() => unFollowerHandler(user.followers[index])}>Remove Follower</button>
                                    {   followingBack ? 
                                        <p>Following Back</p> :
                                        <button onClick={() => followBackHandler(user.followers[index])}>Follow Back</button>
                                    }
                                </div>
                            )
                        })
                    }
                </div>

            </div>
        </div>

    )
}

export default UserInfoPage

// <button onClick={() => history.push('/add')}>Redirect</button>

// <h3>Following ({user.following.length}): </h3>
// {
//     followingUsernames.map((followingUsername, index) => {
//         return (
//             <div key={followingUsername}>
//             <p>{followingUsername}</p>
//             <button >Unfollow</button> 
//             </div>
            
//         )
//     })
// }