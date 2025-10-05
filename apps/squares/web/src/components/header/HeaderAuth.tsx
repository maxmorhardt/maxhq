import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { JSX } from 'react';
import { useAuth } from 'react-oidc-context';

interface HeaderAuthProps {
	handleOpenUserMenu: (event: React.MouseEvent<HTMLElement>) => void
	handleCloseUserMenu: () => void
	handleRegister: () => void
	handleSettingClick: (setting: string) => void
	anchorElUser: null | HTMLElement
	settings: { name: string, icon: JSX.Element}[]
}

export default function HeaderAuth({
	handleOpenUserMenu,
	handleCloseUserMenu,
	handleRegister,
	handleSettingClick,
	anchorElUser,
	settings
}: HeaderAuthProps) {
	const auth = useAuth()

	return (
		<Box sx={{ flexGrow: 0 }}>
			{!auth.isAuthenticated ? (
				<Box sx={{ display: { xs: 'none', md: 'flex' } }}>
					<Button color="inherit" sx={{ mr: 2 }} onClick={() => auth.signinRedirect()} variant="outlined">
						Login
					</Button>
					<Button color="primary" onClick={handleRegister} variant="contained">
						Register
					</Button>
				</Box>
			) : (
				<>
					<Tooltip title="Open settings">
						<IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
							<Avatar alt={auth.user?.profile?.name} src={auth.user?.profile?.name} />
						</IconButton>
					</Tooltip>
					<Menu
						sx={{ mt: '45px' }}
						id="menu-appbar"
						anchorEl={anchorElUser}
						anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
						transformOrigin={{ vertical: 'top', horizontal: 'right' }}
						open={Boolean(anchorElUser)}
						onClose={handleCloseUserMenu}
					>
						{settings.map(setting => (
							<MenuItem key={setting.name} onClick={() => handleSettingClick(setting.name)}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									{setting.icon}
									<Typography>{setting.name}</Typography>
								</Box>
							</MenuItem>
						))}
					</Menu>
				</>
			)}
		</Box>
	)
}