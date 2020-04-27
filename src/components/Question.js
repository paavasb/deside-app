import React, { useState } from 'react'
import VoteOptions from './VoteOptions'

const Question = (props) => {
    const [answered, setAnswered] = useState(false)
    const [question, setQuestion] = useState(props.question)
    
    const voteForOption = (voteText) => {
        setAnswered(true);
        const newOptions = question.options.map((option) => (
            option.text === voteText ? {text: option.text, votes: option.votes+1} : option)
        )
        setQuestion({...question, options: newOptions})

    }

    return (
        <div>
            <h3>{question.title}</h3>
            <VoteOptions 
                options={question.options}
                answered={answered}
                voteForOption={voteForOption}
            />
            {answered && <p>Thanks for answering the question!</p>}
        </div>
    )
}

export default Question