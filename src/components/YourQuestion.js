import React, { useState, useContext } from 'react'
import VoteOptions from './VoteOptions'
import Options from './Options'
import QuestionsContext from '../context/questions-context'
import { startRemoveQuestion } from '../actions/questions'

const YourQuestion = (props) => {
    const question = props.question
    const { questions, dispatch } = useContext(QuestionsContext)
    //const [question, setQuestion] = useState(props.question)
    //const [chosenOption, setChosenOption] = useState('');


    let noTags = question.tags.length === 1 && question.tags[0] === 'none'

    const handleDelete = (e) => {
        e.preventDefault()
        startRemoveQuestion(dispatch, question.refID, question.id, question.creator)
    }

    return (
        <div className="content-container content-container--question">
            <h2>{question.title}</h2>
            <VoteOptions 
                options={question.options}
                selfQuestion={true}
            />
            <div className="react-tagsinput">
                <h3 className="react-tagsinput__text">Tags: </h3>
                {noTags && <p className="react-tagsinput__noTag">There are no tags for this question</p>}
                {(!noTags) && question.tags.map((tag) => <h4 key={tag} className="react-tagsinput-tag">{tag}</h4>)}
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
