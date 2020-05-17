import React from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { startLogout } from '../actions/auth';

export const Header = ({ startLogout }) => {

    const onLogoClick = () => {
        if(document.getElementById("logo").src.includes("logo.png")) {
            document.getElementById("logo").src = "../images/logo_reverse.png";
            alert('Congratulations!! You found the easter egg!')
        } else if(document.getElementById("logo").src.includes("logo_reverse.png")) {
            document.getElementById("logo").src = "../images/logo.png";
        }
    }

    return (
        <header className="header">
            <div className="content-container-header">
                <div className="header__content">
                    <img id="logo" className="header__img" src="../images/logo.png" onClick={onLogoClick}/>
                    <NavLink className="button button--link" to="/add" activeClassName="button button--link-active">
                        <p>Add a Question</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/questions" activeClassName="button button--link-active">
                        <p>Answer Questions</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/yourquestions" activeClassName="button button--link-active">
                        <p>Your Questions</p>
                    </NavLink>
                    <NavLink className="button button--link-last" to="/user" activeClassName="button button--link-last-active">
                        <p>Your Profile</p>
                    </NavLink>
                    <button className="button button--logout" onClick={startLogout}>Logout</button>
                </div>
            </div>
        </header>
    )
}

const mapDispatchToProps = (dispatch) => ({
    startLogout: () => dispatch(startLogout())
});

export default connect(undefined, mapDispatchToProps)(Header);