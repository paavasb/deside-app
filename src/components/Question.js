import React, { useState, useContext, useEffect } from 'react'
import VoteOptions from './VoteOptions'
import QuestionsContext from '../context/questions-context'
import { startVoteQuestion, addVoted, checkVoted } from '../actions/questions'

const Question = (props) => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const [answered, setAnswered] = useState(false)
    const [question, setQuestion] = useState(props.question)
    const [chosenOption, setChosenOption] = useState('')

    useEffect(() => {
        async function checkingVoted() {
            const chosenOptionText = await checkVoted(question)
            setChosenOption(chosenOptionText)
            setAnswered(!!chosenOptionText)
        }
        checkingVoted()
    }, [])

    const voteForOption = (voteText) => {
        setAnswered(true);
        setChosenOption(voteText)
        const newOptions = question.options.map((option) => (
            option.text === voteText ? {text: option.text, votes: option.votes+1} : option)
        )
        const votePromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(addVoted(question, newOptions, voteText, dispatch))
            }, 5000)
        })

        votePromise.then((answeredOptionText) => {
            if(!answeredOptionText) {
                setQuestion({...question, options: newOptions})
            } else {
                console.log('Question already answered')
            }
        })
    }

    const chosenOptionText = `Thanks for answering this question! You chose ${chosenOption}.`

    let noTags = question.tags.length === 1 && question.tags[0] === 'none'

    return (
        <div className="content-container content-container--question">
            <h2>{question.title}</h2>
            <VoteOptions 
                options={question.options}
                answered={answered}
                voteForOption={voteForOption}
                chosenOption={chosenOption}
                selfQuestion={false}
            />
            <div className="react-tagsinput">
                <h3 className="react-tagsinput__text">Tags: </h3>
                {noTags && <p className="react-tagsinput__noTag">There are no tags for this question</p>}
                {(!noTags) && question.tags.map((tag) => <h4 key={tag} className="react-tagsinput-tag">{tag}</h4>)}
            </div>

            {answered && <h4>{chosenOptionText}</h4>}
        </div>
    )
}

export default Question