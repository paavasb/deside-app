import React, { useState, useContext } from 'react'
import Switch from "react-switch"
import VoteOptions from './VoteOptions'
import Options from './Options'
import QuestionsContext from '../context/questions-context'
import { startRemoveQuestion, startChangeAnonymous, startChangePrivacy } from '../actions/questions'
import UserContext from '../context/user-context'

const YourQuestion = (props) => {
    const question = props.question
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    const [anonymous, setAnonymous] = useState(question.anonymous)
    const [priv, setPriv] = useState(question.priv)
    const [updating, setUpdating] = useState(false)
    //const [question, setQuestion] = useState(props.question)
    //const [chosenOption, setChosenOption] = useState('');


    let noTags = question.tags.length === 1 && question.tags[0] === 'none'

    const handleDelete = (e) => {
        e.preventDefault()
        startRemoveQuestion(dispatch, question.refID, question.id, question.creator, userDispatch)
    }

    const handleAnonymousChange = (anon) => {
        startChangeAnonymous(dispatch, question.refID, question.id, anon).then(() => {
            setAnonymous(anon)
        })
    }

    const handlePrivacyChange = (priv) => {
        setUpdating(true)
        startChangePrivacy(dispatch, question.refID, question.id, priv).then(() => {
            setPriv(priv)
            setUpdating(false)
        })
    }

    return (
        <div className="content-container content-container--question">
            <h2 className="questions__text">{question.title}</h2>
            <VoteOptions 
                options={question.options}
                selfQuestion={true}
            />
            <div className="react-tagsinput">
                <h3 className="react-tagsinput__text">Tags: </h3>
                {noTags && <p className="react-tagsinput__noTag">There are no tags for this question</p>}
                {(!noTags) && question.tags.map((tag) => <h4 key={tag} className="react-tagsinput-tag">{tag}</h4>)}
            </div>
            {updating && <p className="add-question__updating">Updating...</p>}
            <div className="add-question__switches">
                <div className="add-question__switch">
                    <p className=" add-question__switch__text add-question__switch__text--prompt">Posted As</p>
                    <div className="add-question__options">
                        <p className={anonymous ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>{user.username}</p>
                        <Switch 
                            checked={anonymous}
                            onChange={handleAnonymousChange} 
                            offColor='#282b36'
                            onColor='#282b36'
                            onHandleColor='#a5afd7'
                            offHandleColor='#a5afd7'
                            checkedIcon={false}
                            uncheckedIcon={false}
                        />
                        <p className={!anonymous ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Anonymous</p>    
                    </div>
                </div>
                <div className="add-question__switch">
                    <p className="add-question__switch__text add-question__switch__text--prompt">Visibility</p>
                    <div className="add-question__options">
                        <p className={priv ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Public</p>
                        <Switch 
                            checked={priv} 
                            onChange={handlePrivacyChange}
                            offColor='#282b36'
                            onColor='#282b36'
                            onHandleColor='#a5afd7'
                            offHandleColor='#a5afd7'
                            checkedIcon={false}
                            uncheckedIcon={false}
                        />
                        <p className={!priv ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Private</p>    
                    </div>   
                </div>
            </div>
            <button
                    className="button button--deleteQuestion"
                    onClick={handleDelete} 
                >
                    Delete Question
            </button>
        </div>
    )
}

export default YourQuestion
