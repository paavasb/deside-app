import React, { useState } from 'react'
import VoteOptions from './VoteOptions'

const Question = (props) => {
    const [answered, setAnswered] = useState(false)
    const [question, setQuestion] = useState(props.question)
    const [chosenOption, setChosenOption] = useState('');
    
    const voteForOption = (voteText) => {
        setAnswered(true);
        setChosenOption(voteText)
        const newOptions = question.options.map((option) => (
            option.text === voteText ? {text: option.text, votes: option.votes+1} : option)
        )
        setQuestion({...question, options: newOptions})
    }

    const chosenOptionText = `Thanks for answering this question! You chose ${chosenOption}.`

    return (
        <div>
            <h2>{question.title}</h2>
            <VoteOptions 
                options={question.options}
                answered={answered}
                voteForOption={voteForOption}
                chosenOption={chosenOption}
            />
            {answered && <h4>{chosenOptionText}</h4>}
        </div>
    )
}

export default Question