import React, { useContext } from 'react'
import { startRemoveFollowing, startRemoveFollower, startAddFollowing } from '../actions/user'
import UserContext from '../context/user-context'


const OtherUserInfo = ({selectedUser}) => {

    const { user, userDispatch } = useContext(UserContext)

    const unFollowHandler = (id) => {
        async function unFollowHandlerAsync() {
            await startRemoveFollowing(userDispatch, user.userID, id)
        }

        unFollowHandlerAsync()
    }

    const unFollowerHandler = (id) => {
        async function unFollowerHandlerAsync() {
            await startRemoveFollower(userDispatch, user.userID, id)
        }

        unFollowerHandlerAsync()
    }

    const followBackHandler = (id) => {
        async function followBackHandlerAsync() {
            //console.log(followerID)
            await startAddFollowing(userDispatch, user.userID, id)
        }

        followBackHandlerAsync()
    }


    return (
        <div className="user-profile__search__user">
            <div className="user-profile__search__user__name">{selectedUser.username}</div>
            {
                selectedUser.userID === user.userID ?
                <div className="user-profile__search__user__following">~~~You~~~</div> :
                selectedUser.followStatus.followingStatus ?
                <div className="user-profile__search__user__following">Following</div> :
                <div className="user-profile__search__user__not-following">Not Following</div>
            }
            {
                selectedUser.userID !== user.userID &&
                (selectedUser.followStatus.followerStatus ?
                <div className="user-profile__search__user__following">Follower</div> :
                <div className="user-profile__search__user__not-following">Not a Follower</div>)
            }
            {
                selectedUser.followStatus.followingStatus ?
                <button className="button button--search-cancel"
                    disabled={selectedUser.userID === user.userID}
                    onClick={() => unFollowHandler(selectedUser.userID)}>Unfollow</button> :
                selectedUser.followStatus.followerStatus ?
                <button className="button button--search-follow"
                    disabled={selectedUser.userID === user.userID}
                    onClick={() => followBackHandler(selectedUser.userID)}>Follow Back</button> :
                <button className="button button--search-follow"
                    disabled={selectedUser.userID === user.userID}
                    onClick={() => followBackHandler(selectedUser.userID)}>Follow</button>
            }
            {
                selectedUser.followStatus.followerStatus &&
                <button className="button button--search-cancel"
                    disabled={selectedUser.userID === user.userID}
                    onClick={() => unFollowerHandler(selectedUser.userID)}>Remove Follower</button>
            }
        </div>
    )
}

export default OtherUserInfo