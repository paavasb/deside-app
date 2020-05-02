import moment from 'moment'

const getVisibleQuestions = (questions, {text, tag, sortBy, startDate, endDate, status}, answered) => {
    return questions.filter((question) => {
        const createdAtMoment = moment(question.createdAt)
        const startDateMatch = startDate ? startDate.isSameOrBefore(createdAtMoment, 'day') : true
        const endDateMatch = endDate ? endDate.isSameOrAfter(createdAtMoment, 'day') : true
        const textMatch = question.title.toLowerCase().includes(text.toLowerCase())
        let tagsMatch = true
        const qTags = question.tags.map((tag) => tag.toLowerCase())
        tag.forEach((oneTag) => {
            if(!qTags.includes(oneTag.toLowerCase())) {
                tagsMatch = false
            }
        })
        let answeredMatch = true
        if(status === 'all') {
            answeredMatch = true
        } else if(status === 'answered') {
            answeredMatch = answered.includes(question.refID)
        } else if(status === 'unanswered') {
            answeredMatch = !answered.includes(question.refID)
        }
        //const tagMatch = !tag ? true : question.tags.map((tag) => tag.toLowerCase()).includes(tag.toLowerCase())

        return answeredMatch && textMatch && tagsMatch && startDateMatch && endDateMatch
    }).sort((a, b) => {
        if(sortBy === 'date') {
            return a.createdAt < b.createdAt ? 1 : -1
        } else if(sortBy === 'votes') {
            return totalVotes(a) < totalVotes(b) ? 1 : -1
        }
    })
}

export default getVisibleQuestions

const totalVotes = (question) => {
    let total = 0
    question.options.forEach((option) => {
        total += option.votes
    })
    return total
}